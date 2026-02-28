"use client"

import React, { useState } from 'react'

export default function Register() {
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    return (
        <div
            className="w-screen min-h-screen flex items-center justify-center px-4 py-12"
            style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#080a18' }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .dot-grid {
          background-image: radial-gradient(circle, #1a1e40 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .input-base { font-family: 'Poppins', sans-serif; }
        .input-base:focus { outline: none; border-color: #4D2FB2 !important; }
        .input-base::placeholder { color: rgba(255,255,255,0.22); }
        .btn-primary:hover { background-color: #4D2FB2 !important; }
        .btn-sso:hover { border-color: #4D2FB2 !important; }
        .select-base { font-family: 'Poppins', sans-serif; }
        .select-base:focus { outline: none; border-color: #4D2FB2 !important; }
        .select-base option { background-color: #0f1127; }
      `}</style>

            {/* Background */}
            <div className="dot-grid fixed inset-0 z-0" />

            {/* Card */}
            <div
                className="relative z-10 w-full max-w-sm rounded-2xl p-8"
                style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                        style={{ backgroundColor: '#0E21A0', border: '1px solid #4D2FB2' }}
                    >S</div>
                    <span className="text-white font-bold text-base">SitInOS</span>
                </div>

                {/* Title */}
                <h1 className="text-white text-2xl font-black mb-1">Create account</h1>
                <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Register to access the monitoring system
                </p>

                {/* Form */}
                <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>

                    {/* Full name row */}
                    <div className="flex gap-3">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                First Name
                            </label>
                            <input
                                type="text"
                                placeholder="Juan"
                                className="input-base w-full rounded-xl px-4 py-3 text-sm text-white"
                                style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                Last Name
                            </label>
                            <input
                                type="text"
                                placeholder="Dela Cruz"
                                className="input-base w-full rounded-xl px-4 py-3 text-sm text-white"
                                style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                            />
                        </div>
                    </div>

                    {/* Student ID */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Student / Staff ID
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2024-00123"
                            className="input-base w-full rounded-xl px-4 py-3 text-sm text-white"
                            style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                        />
                    </div>

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

                    {/* Role */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Role
                        </label>
                        <select
                            className="select-base w-full rounded-xl px-4 py-3 text-sm text-white appearance-none"
                            style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                        >
                            <option value="">Select your role</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                placeholder="Min. 8 characters"
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

                    {/* Confirm Password */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Re-enter password"
                                className="input-base w-full rounded-xl px-4 py-3 text-sm text-white pr-16"
                                style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(s => !s)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                                style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                            >
                                {showConfirm ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            id="terms"
                            className="w-4 h-4 mt-0.5 cursor-pointer rounded flex-shrink-0"
                            style={{ accentColor: '#4D2FB2' }}
                        />
                        <label htmlFor="terms" className="text-xs font-medium cursor-pointer leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            I agree to the{' '}
                            <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="font-semibold" style={{ color: '#B153D7', textDecoration: 'none' }}>Privacy Policy</a>
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn-primary w-full py-3 rounded-xl text-white text-sm font-bold mt-1"
                        style={{ backgroundColor: '#0E21A0', border: 'none', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        Create Account
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px" style={{ backgroundColor: '#1a1e40' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#1a1e40' }} />
                </div>

                {/* SSO */}
                <button
                    type="button"
                    className="btn-sso w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40', color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins, sans-serif', cursor: 'pointer', transition: 'border-color 0.2s' }}
                >
                    🏫 Continue with School SSO
                </button>

                {/* Login link */}
                <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Already have an account?{' '}
                    <a href="#" className="font-bold" style={{ color: '#B153D7', textDecoration: 'none' }}>
                        Sign In
                    </a>
                </p>
            </div>
        </div>
    )
}