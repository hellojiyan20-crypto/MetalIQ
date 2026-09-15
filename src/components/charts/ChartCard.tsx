import type { ReactNode } from 'react'
import { Card, CardHeader } from '../ui/Card'
import { cn } from '../../lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  controls?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function ChartCard({
  title,
  subtitle,
  icon,
  controls,
  children,
  className,
  bodyClassName,
}: ChartCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} actions={controls} />
      <div className={cn('flex-1 px-3 py-3 sm:px-4', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-medium text-muted">{children}</p>
        <p className="mt-1 text-xs text-faint">Select a wider time range or add rates to see the chart.</p>
      </div>
    </div>
  )
}