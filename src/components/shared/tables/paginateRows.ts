export const paginateRows = <T,>(rows: T[], requestedPage: number, requestedPageSize: number) => {
  const pageSize = Math.max(1, requestedPageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageSize,
    totalPages,
    start,
  };
};
