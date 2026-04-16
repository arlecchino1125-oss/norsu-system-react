import React from 'react';
import { Search } from 'lucide-react';

export interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function SearchFilter({
  value,
  onChange,
  placeholder = 'Search...',
  label = 'Search',
  className = ''
}: SearchFilterProps) {
  return (
    <label className={`flex min-w-[220px] flex-col gap-1 ${className}`.trim()}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 shadow-sm">
        <Search size={16} className="text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}
