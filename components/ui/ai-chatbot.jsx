"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User, Sparkles, AlertCircle, Trash2 } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  "What are the lab rules?",
  "How do I reserve a PC?",
  "Which labs have software I need?",
  "How many sessions do I have left?",
  "What are the time slots?",
  "How do reward points work?",
]

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showCloud, setShowCloud] = useState(true)
  const [hasOpened, setHasOpened] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const chatContainerRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Auto-hide cloud bubble after 8 seconds
  useEffect(() => {
    if (!showCloud || hasOpened) return
    const timer = setTimeout(() => setShowCloud(false), 8000)
    return () => clearTimeout(timer)
  }, [showCloud, hasOpened])

  const getToken = () => localStorage.getItem('token')

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return

    setShowSuggestions(false)
    setError(null)
    setInput('')

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: trimmed, history }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp || new Date().toISOString(),
        }])
      }
    } catch (e) {
      console.error('Chat error:', e)
      setError('Failed to connect. Check your internet connection.')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t connect to the server. Please try again later.',
        timestamp: new Date().toISOString(),
        isError: true,
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setShowSuggestions(true)
    setError(null)
  }

  const formatMessage = (text) => {
    if (!text) return ''
    // Basic markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-xs font-mono">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* Speech cloud bubble */}
      {showCloud && !isOpen && !hasOpened && (
        <div className="fixed bottom-[88px] right-6 z-50 animate-fade-in animate-float">
          <div
            className="relative bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-xl border border-purple-400/20 cursor-pointer group"
            onClick={() => { setShowCloud(false); setHasOpened(true); setIsOpen(true) }}
          >
            <p className="text-white text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-300" />
              Need help? Ask me! 💬
            </p>
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowCloud(false); setHasOpened(true) }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition opacity-0 group-hover:opacity-100"
            >
              <X size={10} />
            </button>
            {/* Triangle pointer */}
            <div
              className="absolute -bottom-2 right-6 w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(109,40,217,0.9)',
              }}
            />
          </div>
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) { setHasOpened(true); setShowCloud(false) } }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-gradient-to-r from-red-500 to-orange-500 rotate-0'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
        }`}
        style={{
          boxShadow: isOpen
            ? '0 0 25px rgba(239,68,68,0.4)'
            : '0 0 30px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)',
        }}
        title={isOpen ? 'Close chat' : 'Ask CCSBot'}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <div className="relative">
            <Bot size={24} className="text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-purple-600 animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] shadow-2xl"
          style={{
            height: 'min(560px, calc(100vh - 8rem))',
            background: 'linear-gradient(180deg, rgba(15,15,35,0.98) 0%, rgba(10,10,28,0.99) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.1)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.3)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border border-purple-500/30 flex items-center justify-center">
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  CCSBot
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">AI</span>
                </h3>
                <p className="text-[10px] text-gray-500">Powered by Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition"
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border border-purple-500/25 flex items-center justify-center mb-3">
                  <Bot size={28} className="text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Hey there! 👋</h4>
                <p className="text-xs text-gray-400 max-w-[260px]">
                  I'm CCSBot, your AI assistant for the Sit-In Monitoring System. Ask me anything about labs, reservations, or policies!
                </p>
              </div>
            )}

            {/* Suggested questions */}
            {showSuggestions && messages.length === 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 border border-white/8 text-gray-400 hover:bg-purple-500/10 hover:border-purple-500/25 hover:text-purple-300 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                    : msg.isError
                      ? 'bg-red-500/20 border border-red-500/30'
                      : 'bg-purple-500/20 border border-purple-500/30'
                }`}>
                  {msg.role === 'user' ? (
                    <User size={13} className="text-indigo-400" />
                  ) : msg.isError ? (
                    <AlertCircle size={13} className="text-red-400" />
                  ) : (
                    <Bot size={13} className="text-purple-400" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600/40 to-purple-600/30 border border-indigo-500/20 text-white rounded-tr-md'
                      : msg.isError
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-md'
                        : 'bg-white/5 border border-[rgba(255,255,255,0.06)] text-gray-300 rounded-tl-md'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div
                      className="chat-response prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-purple-400" />
                </div>
                <div className="bg-white/5 border border-[rgba(255,255,255,0.06)] rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about the system..."
                disabled={loading}
                maxLength={2000}
                className="flex-1 bg-white/5 border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/40 disabled:opacity-50 transition"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-30 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:cursor-not-allowed shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[9px] text-gray-700 mt-1.5 text-center">
              CCSBot can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
