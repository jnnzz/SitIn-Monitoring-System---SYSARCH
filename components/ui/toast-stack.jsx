"use client"

import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

const toneMap = {
  success: {
    icon: CheckCircle2,
    cardClass: 'border-emerald-500/50 bg-emerald-900/90',
    titleClass: 'text-emerald-100',
    bodyClass: 'text-emerald-200/80',
  },
  error: {
    icon: AlertCircle,
    cardClass: 'border-red-500/50 bg-red-900/90',
    titleClass: 'text-red-100',
    bodyClass: 'text-red-200/80',
  },
  warning: {
    icon: TriangleAlert,
    cardClass: 'border-amber-500/50 bg-amber-900/90',
    titleClass: 'text-amber-100',
    bodyClass: 'text-amber-200/80',
  },
  info: {
    icon: Info,
    cardClass: 'border-sky-500/50 bg-slate-900/90',
    titleClass: 'text-slate-100',
    bodyClass: 'text-slate-300/80',
  },
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  return (
    <div className="fixed top-4 right-4 z-200 w-[min(92vw,26rem)] space-y-3 pointer-events-none">
      {toasts.map((toast) => {
        const tone = toneMap[toast.type] || toneMap.info
        const Icon = tone.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur animate-in slide-in-from-right-6 duration-300 ${tone.cardClass}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <Icon size={18} className={tone.titleClass} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${tone.titleClass}`}>{toast.title}</p>
                {toast.description ? (
                  <p className={`mt-1 text-xs leading-relaxed ${tone.bodyClass}`}>{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className={`rounded-md p-1 hover:bg-white/10 transition ${tone.bodyClass}`}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}