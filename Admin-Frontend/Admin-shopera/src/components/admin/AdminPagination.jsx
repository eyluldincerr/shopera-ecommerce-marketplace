function AdminPagination({ page, pageSize, totalCount, isLoading = false, itemLabel = "results", onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(Number(totalCount || 0) / Number(pageSize || 1)));
  const currentPage = Math.min(Math.max(1, Number(page || 1)), totalPages);

  return <nav className="admin-table-pagination" aria-label={`${itemLabel} pagination`}>
    <span className="admin-table-pagination-summary">{Number(totalCount || 0)} {itemLabel}</span>
    <div className="admin-table-pagination-controls">
      {totalPages > 1 && <button type="button" disabled={currentPage <= 1 || isLoading} onClick={() => onPageChange(currentPage - 1)}>Previous</button>}
      <span className="admin-table-pagination-page" aria-current="page">Page {currentPage} of {totalPages}</span>
      {totalPages > 1 && <button type="button" disabled={currentPage >= totalPages || isLoading} onClick={() => onPageChange(currentPage + 1)}>Next</button>}
    </div>
  </nav>;
}

export default AdminPagination;
