import React from 'react';
import DataTable, { DataTableColumn } from './DataTable';
import SearchFilter from '../filters/SearchFilter';

export interface SearchableTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: keyof T | ((row: T, index: number) => React.Key);
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterRows: (rows: T[], searchValue: string) => T[];
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function SearchableTable<T>({
  columns,
  rows,
  rowKey,
  searchValue,
  onSearchChange,
  filterRows,
  searchPlaceholder = 'Search records...',
  emptyMessage
}: SearchableTableProps<T>) {
  const filteredRows = filterRows(rows, searchValue);

  return (
    <div className="space-y-4">
      <SearchFilter
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <DataTable
        columns={columns}
        rows={filteredRows}
        rowKey={rowKey}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
