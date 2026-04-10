"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

let toastIdCounter = 0

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ title, description = '', type = 'info', duration = 3500 }) => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { id, title, description, type }])

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        timersRef.current.delete(id)
      }, duration)

      timersRef.current.set(id, timer)
      return id
    },
    []
  )

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
      timersRef.current.clear()
    }
  }, [])

  return { toasts, pushToast, removeToast }
}