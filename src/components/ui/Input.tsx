import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-negative"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-negative">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return <input className={cn('input', invalid && 'input-error', className)} {...rest} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid, ...rest }: SelectProps) {
  return <select className={cn('select', invalid && 'input-error', className)} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return <textarea className={cn('input resize-none', invalid && 'input-error', className)} {...rest} />
}