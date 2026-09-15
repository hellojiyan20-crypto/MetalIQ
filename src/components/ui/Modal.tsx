import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  size?: keyof typeof sizes
  children?: ReactNode
}

export function Modal({ open, onClose, title, subtitle, footer, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'animate-scale-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-edge bg-surface shadow-pop sm:rounded-2xl',
          sizes[size],
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="btn-icon text-muted hover:bg-surface2 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-edge px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}