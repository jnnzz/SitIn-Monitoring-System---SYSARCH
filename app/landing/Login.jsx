"use client"

import React, { useState } from 'react'

export default function Login() {
  const [showPass, setShowPass] = useState(false)

  return (
    <div
      className="w-screen min-h-screen flex items-center justify-center px-4"
      style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#080a18' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .dot-grid {
          background-image: radial-gradient(circle, #1a1e40 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .input-base {
          font-family: 'Poppins', sans-serif;
        }
        .input-base:focus {
          outline: none;
          border-color: #4D2FB2 !important;
        }
        .input-base::placeholder {
          color: rgba(255,255,255,0.22);
        }

        .btn-primary:hover { background-color: #4D2FB2 !important; }
        .btn-sso:hover { border-color: #4D2FB2 !important; }
      `}</style>

      {/* Background */}
      <div className="dot-grid fixed inset-0 z-0" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl p-8"
        style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}
      >

        {/* Logo */}
        <div className="flex text-center items-center gap-2 mb-8">
      
          <span className="text-white text-center font-bold text-base">SitIn Monitoring System</span>
        </div>

        {/* Title */}
        <h1 className="text-white text-center text-2xl font-black mb-1">Welcome back</h1>
        <p className="text-sm mb-7 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Sign in to your monitoring dashboard
        </p>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={e => e.preventDefault()}>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@school.edu"
              className="input-base w-full rounded-xl px-4 py-3 text-sm text-white"
              style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Password
              </label>
              <a href="#" className="text-xs font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                className="input-base w-full rounded-xl px-4 py-3 text-sm text-white pr-16"
                style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>


          {/* Sign in button */}
          <button
            type="submit"
            className="btn-primary w-full py-3 rounded-xl text-white text-sm font-bold mt-1"
            style={{ backgroundColor: '#0E21A0', border: 'none', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Sign In
          </button>
        </form>

    
       
      </div>
    </div>
  )
}