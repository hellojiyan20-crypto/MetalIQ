import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-edge bg-surface2 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface3', className)} />
}

export function CardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-32" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted">
      <svg className="h-8 w-8 animate-spin text-gold" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      <p className="mt-3 text-sm">{label}…</p>
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="text-sm font-semibold text-negative">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary mt-5"
        >
          Retry
        </button>
      )}
    </div>
  )
}