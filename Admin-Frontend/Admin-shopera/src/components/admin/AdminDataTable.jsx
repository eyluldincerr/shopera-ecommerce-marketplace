function AdminDataTable({
  columns,
  data,
  emptyMessage = "No records found.",
  rowKey = "id",
}) {
  const getRowKey = (row) => {
    if (typeof rowKey === "function") {
      return rowKey(row);
    }

    return row[rowKey];
  };

  return (
    <div className="admin-data-table-wrapper">
      <table className="admin-data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className || ""}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length > 0 ? (
            data.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.className || ""}
                  >
                    {column.render
                      ? column.render(row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="admin-empty-table-message"
                colSpan={columns.length}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDataTable;