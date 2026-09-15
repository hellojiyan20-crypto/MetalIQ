import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn('card shadow-card dark:shadow-card-dark', className)} {...rest}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, subtitle, icon, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-edge px-5 py-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted">{icon}</div>}
        <div className="min-w-0">
          {title && <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-edge px-5 py-3.5', className)} {...rest} />
}