import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor?: (row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: keyof T | ((row: T, index: number) => React.Key);
  emptyMessage?: string;
  pagination?: DataTablePagination;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

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

const defaultSortValue = (value: React.ReactNode) => {
  if (typeof value === 'number') return value;
  return String(value ?? '');
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.',
  pagination
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedRows = [...rows].sort((left, right) => {
    if (!sortKey) return 0;

    const column = columns.find((item) => item.key === sortKey);
    if (!column) return 0;

    const leftValue = column.sortValue
      ? column.sortValue(left)
      : defaultSortValue(column.accessor ? column.accessor(left, 0) : '');
    const rightValue = column.sortValue
      ? column.sortValue(right)
      : defaultSortValue(column.accessor ? column.accessor(right, 0) : '');

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    if (sortKey === column.key) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(column.key);
    setSortDirection('asc');
  };

  const pageData = pagination
    ? paginateRows(sortedRows, pagination.page, pagination.pageSize)
    : { rows: sortedRows, page: 1, pageSize: sortedRows.length || 1, totalPages: 1, start: 0 };
  const rangeStart = sortedRows.length === 0 ? 0 : pageData.start + 1;
  const rangeEnd = sortedRows.length === 0 ? 0 : pageData.start + pageData.rows.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/90">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-500 ${column.className || ''}`.trim()}>
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className={`inline-flex items-center gap-2 ${column.sortable ? 'hover:text-slate-700' : 'cursor-default'}`}
                  >
                    <span>{column.header}</span>
                    {column.sortable && sortKey === column.key ? (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pageData.rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.rows.map((row, index) => (
                <tr key={typeof rowKey === 'function' ? rowKey(row, index) : String(row[rowKey])} className="hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-slate-700 ${column.className || ''}`.trim()}>
                      {column.accessor ? column.accessor(row, index) : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 font-semibold">
              <span>Rows per page</span>
              <select
                aria-label="Rows per page"
                value={pagination.pageSize}
                onChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              >
                {(pagination.pageSizeOptions || [5, 10, 30]).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <span aria-live="polite">{rangeStart}-{rangeEnd} of {sortedRows.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={pageData.page <= 1}
              onClick={() => pagination.onPageChange(pageData.page - 1)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-500">Page {pageData.page} of {pageData.totalPages}</span>
            <button
              type="button"
              aria-label="Next page"
              disabled={pageData.page >= pageData.totalPages}
              onClick={() => pagination.onPageChange(pageData.page + 1)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
