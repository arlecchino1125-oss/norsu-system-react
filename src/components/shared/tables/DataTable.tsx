import React, { useState } from 'react';

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
}

const defaultSortValue = (value: React.ReactNode) => {
  if (typeof value === 'number') return value;
  return String(value ?? '');
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found.'
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
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
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
    </div>
  );
}
