"use client"

import React, { useState, useEffect } from 'react'

// Palette (solid only, no gradients):
// #0E21A0 — deep blue
// #4D2FB2 — violet
// #B153D7 — purple
// #F375C2 — pink

const stats = [
  { label: 'Active Sessions', value: '247', trend: '+12%', up: true },
  { label: 'Avg Duration', value: '42.3m', trend: '+5%', up: true },
  { label: 'Occupancy Rate', value: '87%', trend: '-3%', up: false },
  { label: 'Total Today', value: '1.2K', trend: '+18%', up: true },
]

const features = [
  { icon: '⚡', title: 'Real-Time Tracking', desc: 'Monitor every sit-in session live with instant updates across all zones.' },
  { icon: '📊', title: 'Smart Analytics', desc: 'Visualize occupancy trends, peak hours, and session patterns at a glance.' },
  { icon: '🔔', title: 'Instant Alerts', desc: 'Auto-notify on capacity limits, anomalies, and critical threshold events.' },
  { icon: '🗂️', title: 'Session Logs', desc: 'Full audit trail with exportable records for reporting and compliance.' },
  { icon: '🎯', title: 'Zone Management', desc: 'Define specific areas with granular occupancy and access controls.' },
  { icon: '🔐', title: 'Secure Access', desc: 'Role-based permissions and encrypted data keep your system protected.' },
]

const navLinks = ['Features', 'Dashboard', 'Analytics', 'Pricing']
const bars = [45, 70, 55, 90, 65, 80, 95]
const zones = [
  { label: 'Library', val: 82, hot: false },
  { label: 'Lab A', val: 61, hot: false },
  { label: 'Cafeteria', val: 94, hot: true },
]

export default function Landing() {
  const [liveCount, setLiveCount] = useState(247)

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(c => Math.max(200, c + Math.floor(Math.random() * 7) - 3))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="w-screen min-h-screen overflow-x-hidden text-white"
      style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#080a18' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .dot-grid {
          background-image: radial-gradient(circle, #1a1e40 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .dot-blink { animation: blink 1.2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        .feat-card { transition: border-color 0.2s, transform 0.2s; }
        .feat-card:hover { border-color: #4D2FB2 !important; transform: translateY(-3px); }
        .btn-main { transition: background 0.2s, transform 0.15s; }
        .btn-main:hover { background: #4D2FB2 !important; transform: translateY(-2px); }
        .btn-ghost { transition: background 0.2s, color 0.2s; }
        .btn-ghost:hover { background: #4D2FB2 !important; color: #fff !important; }
        .nav-a { transition: color 0.2s; }
        .nav-a:hover { color: #fff !important; }
      `}</style>

      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 w-screen z-50 flex items-center justify-between px-12 h-16"
        style={{ backgroundColor: 'rgba(8,10,24,0.95)', borderBottom: '1px solid #1a1e40', backdropFilter: 'blur(16px)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
            style={{ backgroundColor: '#0E21A0', border: '1px solid #4D2FB2' }}
          >S</div>
          <span className="font-bold text-base">SitInOS</span>
        </div>

        {/* Links */}
        <div className="flex gap-9">
          {navLinks.map(l => (
            <a key={l} href="#" className="nav-a text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="btn-ghost px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'transparent', border: '1.5px solid #4D2FB2', color: '#B153D7' }}
          >Sign In</button>
          <button
            className="btn-main px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#0E21A0', border: 'none' }}
          >Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="dot-grid w-screen pt-36 pb-20 px-12 flex items-center gap-16 flex-wrap">
        {/* Left */}
        <div className="flex-1" style={{ minWidth: 480 }}>
          {/* Live pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-7"
            style={{ backgroundColor: '#0f1127', border: '1px solid #F375C2', color: 'rgba(255,255,255,0.6)' }}
          >
            <span className="dot-blink w-2 h-2 rounded-full" style={{ backgroundColor: '#F375C2', display: 'inline-block', flexShrink: 0 }} />
            <span><span className="font-bold" style={{ color: '#F375C2' }}>{liveCount}</span> sessions active right now</span>
          </div>

          <h1 className="font-black leading-tight mb-5" style={{ fontSize: 'clamp(2.6rem,5vw,4.2rem)', letterSpacing: '-0.025em' }}>
            Monitor Every<br />
            <span style={{ color: '#B153D7' }}>Sit-In Session</span><br />
            In Real Time.
          </h1>

          <p className="text-base leading-relaxed mb-9" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 480 }}>
            SitInOS gives you complete visibility over occupancy — from live session tracking to deep analytics — all in one clean dashboard.
          </p>

          <div className="flex gap-3 flex-wrap">
            <button
              className="btn-main px-8 py-3.5 rounded-xl text-base font-semibold text-white"
              style={{ backgroundColor: '#0E21A0', border: 'none' }}
            >Start Monitoring Free →</button>
            <button
              className="btn-ghost px-8 py-3.5 rounded-xl text-base font-semibold"
              style={{ background: 'transparent', border: '1.5px solid #4D2FB2', color: '#B153D7' }}
            >Watch Demo</button>
          </div>

          {/* Micro stats */}
          <div className="flex gap-10 mt-12">
            {[['500+', 'Institutions'], ['2M+', 'Sessions tracked'], ['99.9%', 'Uptime']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-black" style={{ color: '#B153D7' }}>{v}</div>
                <div className="text-xs font-medium mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mini dashboard */}
        <div className="flex-1 flex justify-end" style={{ minWidth: 320 }}>
          <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: 400, backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: '#0E21A0' }}>
              <div className="flex items-center gap-2">
                <span className="dot-blink w-2 h-2 rounded-full" style={{ backgroundColor: '#F375C2', display: 'inline-block' }} />
                <span className="text-sm font-semibold">Live Dashboard</span>
              </div>
              <span className="text-xs font-black rounded px-2 py-0.5" style={{ backgroundColor: '#F375C2', color: '#080a18' }}>LIVE</span>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Big number + bars */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Active Sessions</div>
                  <div className="text-5xl font-black leading-none" style={{ color: '#B153D7' }}>{liveCount}</div>
                  <div className="text-xs font-semibold mt-1.5" style={{ color: '#B153D7' }}>↑ 12% vs yesterday</div>
                </div>
                <div className="flex gap-1.5 items-end" style={{ height: 56 }}>
                  {bars.map((h, i) => (
                    <div key={i} className="rounded-t w-2.5 flex-1" style={{ height: `${h}%`, backgroundColor: '#4D2FB2' }} />
                  ))}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #1a1e40', marginBottom: 16 }} />

              {/* Zones */}
              {zones.map(z => (
                <div key={z.label} className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{z.label}</span>
                    <span className="text-xs font-bold" style={{ color: z.hot ? '#F375C2' : '#B153D7' }}>{z.val}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded" style={{ backgroundColor: '#1a1e40' }}>
                    <div className="h-full rounded" style={{ width: `${z.val}%`, backgroundColor: z.hot ? '#F375C2' : '#B153D7' }} />
                  </div>
                </div>
              ))}

              {/* Mini stats */}
              <div className="flex gap-2.5 mt-4">
                {[['Bounce Rate', '14%'], ['Avg Time', '42.3m']].map(([label, val]) => (
                  <div key={label} className="flex-1 rounded-xl p-3" style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}>
                    <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                    <div className="text-xl font-bold">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="w-screen px-12 pb-20">
        <div className="w-full flex gap-4 flex-wrap">
          {stats.map((s, i) => (
            <div key={i} className="flex-1 rounded-2xl p-6" style={{ minWidth: 160, backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
              <div className="text-4xl font-black mb-1.5" style={{ color: '#B153D7' }}>{s.value}</div>
              <div className="text-xs font-semibold" style={{ color: s.up ? '#B153D7' : '#F375C2' }}>{s.trend} this week</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="w-screen px-12 py-20" style={{ backgroundColor: '#0d0f22' }}>
        <div className="w-full">
          {/* Heading */}
          <div className="text-center mb-14">
            <span
              className="inline-block text-xs font-bold uppercase tracking-widest rounded-full px-4 py-1.5 mb-4"
              style={{ backgroundColor: '#0f1127', border: '1px solid #4D2FB2', color: '#B153D7' }}
            >Features</span>
            <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>
              Built to monitor <span style={{ color: '#B153D7' }}>smarter</span>
            </h2>
            <p className="text-sm leading-relaxed mt-3 mx-auto" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 400 }}>
              Everything your team needs to track, analyze, and optimize sit-in sessions.
            </p>
          </div>

          {/* Grid */}
          <div className="w-full grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {features.map((f, i) => (
              <div key={i} className="feat-card rounded-2xl p-7" style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}>
                <div className="text-2xl mb-3">{f.icon}</div>
                <div className="font-bold text-base mb-2">{f.title}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="w-screen px-12 py-20">
        <div className="w-full rounded-2xl p-16 text-center" style={{ backgroundColor: '#0E21A0' }}>
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest rounded-full px-4 py-1.5 mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >Get Started</span>
          <h2 className="font-black leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)' }}>
            Take control of your<br /><span style={{ color: '#F375C2' }}>sit-in sessions</span> today
          </h2>
          <p className="text-sm leading-relaxed mb-10 mx-auto" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 460 }}>
            Join institutions already using SitInOS to streamline occupancy monitoring and gain real clarity over their spaces.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button
              className="btn-main px-10 py-3.5 rounded-xl text-base font-semibold text-white"
              style={{ backgroundColor: '#4D2FB2', border: 'none' }}
            >Start for Free</button>
            <button
              className="btn-ghost px-10 py-3.5 rounded-xl text-base font-semibold"
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff' }}
            >Schedule a Demo</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-screen px-12 py-7 flex items-center justify-between flex-wrap gap-4" style={{ borderTop: '1px solid #1a1e40' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: '#0E21A0', border: '1px solid #4D2FB2' }} />
          <span className="font-bold text-sm">SitInOS</span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© 2025 SitInOS · All rights reserved</span>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Support'].map(l => (
            <a key={l} href="#" className="nav-a text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}