import { useMemo } from 'react'

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

function buildPageNums(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const nums: (number | '…')[] = [1]
  if (page > 3) nums.push('…')
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
  if (page < totalPages - 2) nums.push('…')
  nums.push(totalPages)
  return nums
}

interface PaginationBarProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (pageSize: number) => void
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageSizeChange,
}: PaginationBarProps) {
  const nums = useMemo(() => buildPageNums(page, totalPages), [page, totalPages])
  const showNav = totalPages > 1
  const showSizeSelector = Boolean(onPageSizeChange && pageSizeOptions.length > 0)

  if (totalItems === 0) return null
  if (!showNav && !showSizeSelector) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="pagination-bar">
      <div className="pagination-bar__meta">
        <span className="pagination-bar__range">
          {from}–{to} of {totalItems}
        </span>
        {showSizeSelector && (
          <div className="pagination-bar__size">
            <span className="pagination-bar__size-label">Rows:</span>
            {pageSizeOptions.map((ps) => (
              <button
                key={ps}
                type="button"
                className={`page-size-pill${pageSize === ps ? ' is-active' : ''}`}
                onClick={() => onPageSizeChange!(ps)}
              >
                {ps}
              </button>
            ))}
          </div>
        )}
      </div>
      {showNav && (
        <div className="pagination-bar__nav">
          <button
            type="button"
            className="page-size-pill page-nav-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            ←
          </button>
          {nums.map((n, i) => (
            n === '…' ? (
              <span key={`ellipsis-${i}`} className="pagination-bar__ellipsis">…</span>
            ) : (
              <button
                key={n}
                type="button"
                className={`page-size-pill${page === n ? ' is-active' : ''}`}
                onClick={() => onPageChange(n)}
              >
                {n}
              </button>
            )
          ))}
          <button
            type="button"
            className="page-size-pill page-nav-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
