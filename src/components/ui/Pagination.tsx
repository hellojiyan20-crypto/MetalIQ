import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, className }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      <p className="text-xs text-muted">
        {from}–{to} of {total} entries
      </p>
      {onPageSizeChange && (
        <select
          className="select w-auto py-1 text-xs"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-icon h-8 w-8 text-muted disabled:opacity-30 hover:bg-surface2 hover:text-ink"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-xs font-semibold text-ink num">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="btn-icon h-8 w-8 text-muted disabled:opacity-30 hover:bg-surface2 hover:text-ink"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}