import React from 'react';

export interface SelectFilterOption {
  label: string;
  value: string;
}

export interface SelectFilterProps {
  label: string;
  value: string;
  options: SelectFilterOption[];
  onChange: (value: string) => void;
  className?: string;
}

export default function SelectFilter({
  label,
  value,
  options,
  onChange,
  className = ''
}: SelectFilterProps) {
  return (
    <label className={`flex min-w-[150px] flex-col gap-1 ${className}`.trim()}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-emerald-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
