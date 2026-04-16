import React from 'react';
import { Download } from 'lucide-react';
import DataTable, { DataTableColumn } from './DataTable';

export interface ExportableTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: keyof T | ((row: T, index: number) => React.Key);
  filename: string;
  exportHeaders: string[];
  exportRows: (rows: T[]) => string[][];
  emptyMessage?: string;
}

export default function ExportableTable<T>({
  columns,
  rows,
  rowKey,
  filename,
  exportHeaders,
  exportRows,
  emptyMessage
}: ExportableTableProps<T>) {
  const handleExport = () => {
    const csv = [exportHeaders, ...exportRows(rows)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
