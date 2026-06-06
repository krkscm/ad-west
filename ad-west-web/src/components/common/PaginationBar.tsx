import { useMemo } from 'react'

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
}

export function PaginationBar({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationBarProps) {
  const nums = useMemo(() => buildPageNums(page, totalPages), [page, totalPages])

  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border-dark)' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary-dark)', textAlign: 'center' }}>
        {from}–{to} of {totalItems}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="page-size-pill"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
        >
          ←
        </button>
        {nums.map((n, i) => (
          n === '…' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '4px 2px', color: 'var(--text-secondary-dark)', fontSize: '0.75rem' }}>…</span>
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
          className="page-size-pill"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
        >
          →
        </button>
      </div>
    </div>
  )
}
