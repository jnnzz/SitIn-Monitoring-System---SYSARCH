"use client"

import React, { useState } from 'react'
import { Particles } from './../../components/ui/particles'
import { BorderBeam } from './../../components/ui/border-beam'
import { BlurFade } from './../../components/ui/blur-fade'
import { ShimmerButton } from './../../components/ui/shimmer-button'

export default function Register() {
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div
      className="relative w-1/2 min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden"
      style={{ fontFamily: "'Poppins', sans-serif", backgroundColor: '#080a18' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .inp { font-family: 'Poppins', sans-serif; }
        .inp:focus { outline: none; border-color: #4D2FB2 !important; }
        .inp::placeholder { color: rgba(255,255,255,0.22); }
        .inp option { background-color: #0f1127; }
        .btn-sso:hover { border-color: #4D2FB2 !important; color: #fff !important; }
      `}</style>

      {/* Magic UI — Particles background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={120}
        color="#4D2FB2"
        ease={80}
        size={0.5}
      />

      {/* Card */}
      <BlurFade delay={0.1} inView>
        <div
          className="relative z-10 w-full max-w-lg rounded-2xl p-8 overflow-hidden"
          style={{ backgroundColor: '#0f1127', border: '1px solid #1a1e40' }}
        >
          {/* Magic UI — BorderBeam on card */}
          <BorderBeam
            size={250}
            duration={10}
            colorFrom="#0E21A0"
            colorTo="#F375C2"
          />
            
          {/* Logo */}
          <BlurFade delay={0.2} inView>
            <div className="flex items-center gap-2 text-center mb-8">
              {/* <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ backgroundColor: '#0E21A0', border: '1px solid #4D2FB2' }}
              >S</div> */}
              <span className="text-white text-center font-bold text-base">Sit-In Monitoring System</span>
            </div>
          </BlurFade>

          {/* Title */}
          <BlurFade delay={0.3} inView>
            <h1 className="text-white text-2xl font-black mb-1">Create account</h1>
            <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Register to access the monitoring system
            </p>
          </BlurFade>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>

            {/* First & Last Name */}
            <BlurFade delay={0.35} inView>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                  <input
                    type="text"
                    placeholder="Juan"
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Middle Name</label>
                  <input
                    type="text"
                    placeholder="Lim"
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                  <input
                    type="text"
                    placeholder="Dela Cruz"
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                  />
                </div>
              </div>
            </BlurFade>
              {/* Course */}
            <BlurFade delay={0.5} inView>
              <div className="flex flex-row gap-1.5">
                <div>
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Course</label>
                    <select
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white appearance-none"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                    >
                    <option value="">Select your course</option>
                    <option value="BSIT">Bachelor of Science in Information Technology</option>
                    <option value="BSCS">Bachlor of Science in Computer Science</option>
                    </select>
                </div>
                 <div>
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Course Level</label>
                    <select
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white appearance-none"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                    >
                    <option value="">Select Year</option>
                    <option value="first">1st Year</option>
                    <option value="second">2nd Year</option>
                    <option value="third">3rd Year</option>
                    <option value="fourth">4th Year</option>

                    </select>
                </div>
              </div>
            </BlurFade>

            {/* Student ID */}
            <BlurFade delay={0.4} inView>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Student ID</label>
                <input
                  type="text"
                  placeholder="e.g. 23781234"
                  className="inp w-full rounded-xl px-4 py-3 text-sm text-white"
                  style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                />
              </div>
            </BlurFade>

            {/* Email */}
            <BlurFade delay={0.45} inView>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  className="inp w-full rounded-xl px-4 py-3 text-sm text-white"
                  style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                />
              </div>
            </BlurFade>

            {/* Password */}
            <BlurFade delay={0.55} inView>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white pr-16"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                  >{showPass ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </BlurFade>

            {/* Confirm Password */}
            <BlurFade delay={0.6} inView>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    className="inp w-full rounded-xl px-4 py-3 text-sm text-white pr-16"
                    style={{ backgroundColor: '#080a18', border: '1px solid #1a1e40' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: '#4D2FB2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}
                  >{showConfirm ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </BlurFade>

            {/* Terms */}
            <BlurFade delay={0.65} inView>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
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
            </BlurFade>

            {/* Magic UI — ShimmerButton */}
            <BlurFade delay={0.7} inView>
              <ShimmerButton
                className="w-full py-3 rounded-xl text-sm font-bold mt-1"
                background="#0E21A0"
                shimmerColor="#4D2FB2"
                shimmerSize="0.1em"
              >
                Create Account
              </ShimmerButton>
            </BlurFade>
          </form>

          {/* Divider */}
          {/*  */}

        </div>
      </BlurFade>
    </div>
  )
}