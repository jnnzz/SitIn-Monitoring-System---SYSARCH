"use client"

export function paginateItems(items, page, pageSize) {
  const safeItems = Array.isArray(items) ? items : []
  const totalItems = safeItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(page || 1, 1), totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  return {
    items: safeItems.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage,
    startIndex,
  }
}

export function TablePagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.15)]">
      <p className="text-xs text-gray-500">
        Showing <span className="font-bold text-gray-300">{from}-{to}</span> of{' '}
        <span className="font-bold text-gray-300">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <span className="text-xs text-gray-400 px-2">
          Page <span className="font-bold text-gray-200">{page}</span> of{' '}
          <span className="font-bold text-gray-200">{totalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
