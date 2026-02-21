"use client"

import React, { useState, useEffect } from 'react'

const stats = [
  { label: 'Active Sessions', value: '247', unit: '', trend: '+12%' },
  { label: 'Avg Duration', value: '42.3', unit: 'min', trend: '+5%' },
  { label: 'Occupancy Rate', value: '87', unit: '%', trend: '-3%' },
  { label: 'Total Today', value: '1.2K', unit: '', trend: '+18%' },
]

const features = [
  {
    icon: '⚡',
    title: 'Real-Time Tracking',
    desc: 'Monitor every sit-in session as it happens with live updates and instant alerts.',
  },
  {
    icon: '📊',
    title: 'Smart Analytics',
    desc: 'Deep insights into occupancy trends, peak hours, and session patterns.',
  },
  {
    icon: '🔔',
    title: 'Instant Alerts',
    desc: 'Get notified on capacity limits, anomalies, and critical events automatically.',
  },
  {
    icon: '🗂️',
    title: 'Session Logs',
    desc: 'Complete audit trail with exportable records for reporting and compliance.',
  },
  {
    icon: '🎯',
    title: 'Zone Management',
    desc: 'Define and monitor specific zones with granular occupancy controls.',
  },
  {
    icon: '🔐',
    title: 'Secure Access',
    desc: 'Role-based permissions and encrypted data keep your monitoring secure.',
  },
]

const navLinks = ['Features', 'Dashboard', 'Analytics', 'Pricing', 'Contact']

export default function Landing() {
  const [liveCount, setLiveCount] = useState(247)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(c => c + Math.floor(Math.random() * 5) - 2)
      setTick(t => t + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        background: '#07091a',
        fontFamily: "'Syne', sans-serif",
        minHeight: '100vh',
        overflowX: 'hidden',
        color: '#fff',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --c1: #0E21A0;
          --c2: #4D2FB2;
          --c3: #B153D7;
          --c4: #F375C2;
        }

        .gradient-text {
          background: linear-gradient(135deg, #F375C2 0%, #B153D7 40%, #4D2FB2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .pill-nav {
          background: rgba(13, 17, 50, 0.7);
          border: 1px solid rgba(77, 47, 178, 0.3);
          backdrop-filter: blur(20px);
        }

        .card-dark {
          background: rgba(14, 33, 160, 0.08);
          border: 1px solid rgba(77, 47, 178, 0.25);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .card-dark:hover {
          border-color: rgba(177, 83, 215, 0.5);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(177, 83, 215, 0.15);
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(14, 33, 160, 0.3), rgba(77, 47, 178, 0.2));
          border: 1px solid rgba(177, 83, 215, 0.3);
        }

        .live-card {
          background: linear-gradient(135deg, #0E21A0, #4D2FB2);
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(14, 33, 160, 0.4); }
          50% { box-shadow: 0 0 60px rgba(77, 47, 178, 0.7); }
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #4D2FB2, #B153D7);
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(177, 83, 215, 0.4);
        }

        .btn-outline {
          border: 1px solid rgba(177, 83, 215, 0.5);
          color: #B153D7;
          transition: all 0.3s ease;
        }

        .btn-outline:hover {
          background: rgba(177, 83, 215, 0.1);
          border-color: #F375C2;
          color: #F375C2;
        }

        .nav-link {
          color: rgba(255,255,255,0.6);
          transition: color 0.2s;
        }

        .nav-link:hover { color: #F375C2; }

        .grid-bg {
          background-image: 
            linear-gradient(rgba(77, 47, 178, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(77, 47, 178, 0.07) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .live-dot {
          width: 8px; height: 8px;
          background: #F375C2;
          border-radius: 50%;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }

        .mini-bar {
          background: linear-gradient(to top, #4D2FB2, #B153D7);
          border-radius: 3px;
          animation: bar-grow 0.5s ease;
        }

        .wave-line {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: draw 2s ease forwards;
        }

        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }

        .tag {
          background: rgba(177, 83, 215, 0.15);
          border: 1px solid rgba(177, 83, 215, 0.3);
          color: #B153D7;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 100px;
        }

        .number-flip {
          transition: all 0.3s ease;
        }

        .footer-gradient {
          background: linear-gradient(to top, rgba(14, 33, 160, 0.15), transparent);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .float-card {
          animation: float 4s ease-in-out infinite;
        }
        .float-card-delay {
          animation: float 4s ease-in-out 1s infinite;
        }
      `}</style>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5">
        <div className="pill-nav rounded-full px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #4D2FB2, #B153D7)', borderRadius: 8 }} className="flex items-center justify-center text-xs font-bold">S</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>SitInOS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l} href="#" className="nav-link text-sm">{l}</a>
            ))}
          </div>
          <button className="btn-primary px-4 py-2 rounded-full text-sm font-semibold text-white">
            Get Access
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="grid-bg relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Glows */}
        <div className="hero-glow" style={{ width: 600, height: 600, background: 'rgba(77, 47, 178, 0.25)', top: '10%', left: '10%' }} />
        <div className="hero-glow" style={{ width: 400, height: 400, background: 'rgba(177, 83, 215, 0.2)', top: '20%', right: '10%' }} />
        <div className="hero-glow" style={{ width: 300, height: 300, background: 'rgba(243, 117, 194, 0.15)', bottom: '15%', left: '30%' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <span className="tag">v2.4 · Live Monitoring Platform</span>
          </div>

          <h1 style={{ fontWeight: 800, fontSize: 'clamp(2.5rem, 7vw, 5.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Know Who's<br />
            <span className="gradient-text">Sitting Where,</span><br />
            Right Now.
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            SitInOS gives you complete visibility over sit-in sessions — real-time occupancy, smart alerts, and beautiful analytics in one unified dashboard.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="btn-primary px-8 py-3.5 rounded-full font-semibold text-white text-base">
              Start Monitoring Free →
            </button>
            <button className="btn-outline px-8 py-3.5 rounded-full font-semibold text-base">
              Watch Demo
            </button>
          </div>

          {/* Live indicator */}
          <div className="flex justify-center mt-10">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(14,33,160,0.3)', border: '1px solid rgba(243,117,194,0.3)', borderRadius: 100, padding: '8px 16px' }}>
              <div className="live-dot" />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: '#F375C2', fontWeight: 600 }} className="number-flip">{liveCount}</span> active sessions right now
              </span>
            </div>
          </div>

          {/* Floating mini dashboard */}
          <div className="relative mt-16 flex justify-center gap-4 flex-wrap">
            <div className="live-card float-card rounded-2xl p-5" style={{ width: 140 }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="live-dot" />
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.7)' }}>LIVE</span>
              </div>
              <div style={{ fontSize: 38, fontWeight: 800 }}>{liveCount}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Active Now</div>
              <button style={{ background: '#F375C2', borderRadius: 8, padding: '6px 0', width: '100%', marginTop: 12, fontSize: 12, fontWeight: 600, color: '#07091a', border: 'none', cursor: 'pointer' }}>View →</button>
            </div>

            <div className="card-dark float-card-delay rounded-2xl p-5" style={{ width: 160 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Bounce Rate</div>
              <div style={{ fontSize: 36, fontWeight: 800 }} className="gradient-text">14%</div>
              <svg width="100%" height="40" viewBox="0 0 140 40" style={{ marginTop: 8 }}>
                <path d="M0,35 C20,35 20,20 40,20 C60,20 60,30 80,10 C100,0 120,15 140,10" fill="none" stroke="url(#g1)" strokeWidth="2" className="wave-line" />
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4D2FB2" />
                    <stop offset="100%" stopColor="#F375C2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="card-dark float-card rounded-2xl p-5" style={{ width: 140 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Avg Duration</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>42.3<span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>min</span></div>
              <div style={{ display: 'flex', gap: 4, marginTop: 12, alignItems: 'flex-end', height: 40 }}>
                {[60, 80, 50, 90, 70, 100, 65].map((h, i) => (
                  <div key={i} className="mini-bar flex-1" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="stat-card rounded-2xl p-6">
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 800 }}>
                <span className="gradient-text">{s.value}</span>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: s.trend.startsWith('+') ? '#B153D7' : '#F375C2' }}>
                {s.trend} this week
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="tag">Features</span>
            <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 3rem)', marginTop: 16, lineHeight: 1.1 }}>
              Everything you need to<br /><span className="gradient-text">monitor smarter</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="card-dark rounded-2xl p-6">
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="hero-glow" style={{ width: 500, height: 500, background: 'rgba(77, 47, 178, 0.3)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1, marginBottom: 20 }}>
            Ready to take control of your <span className="gradient-text">sit-in sessions?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.7 }}>
            Join institutions already using SitInOS to streamline monitoring and gain clarity over their spaces.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button className="btn-primary px-8 py-4 rounded-full font-semibold text-white text-base">
              Get Started for Free
            </button>
            <button className="btn-outline px-8 py-4 rounded-full font-semibold text-base">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-gradient py-10 px-6 border-t" style={{ borderColor: 'rgba(77,47,178,0.2)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #4D2FB2, #B153D7)', borderRadius: 6 }} />
            <span style={{ fontWeight: 700 }}>SitInOS</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            © 2025 SitInOS · All rights reserved
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="nav-link" style={{ fontSize: 13 }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}