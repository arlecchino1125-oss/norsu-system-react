import React from 'react';

export interface DateRangeFilterProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
}

export default function DateRangeFilter({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = 'From',
  endLabel = 'To'
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[150px] flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{startLabel}</span>
        <input
          type="date"
          value={startValue}
          onChange={(event) => onStartChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-emerald-500"
        />
      </label>
      <label className="flex min-w-[150px] flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{endLabel}</span>
        <input
          type="date"
          value={endValue}
          onChange={(event) => onEndChange(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-emerald-500"
        />
      </label>
    </div>
  );
}
