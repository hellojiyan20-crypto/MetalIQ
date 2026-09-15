import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${++idRef.current}`
      setToasts((prev) => [...prev.slice(-4), { id, message, type }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-edge bg-surface p-3.5 shadow-pop"
          >
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-positive" />}
            {t.type === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" />}
            {t.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
            <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-faint transition-colors hover:text-ink"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}