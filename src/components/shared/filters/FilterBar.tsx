import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export default function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`.trim()}>
      {children}
    </div>
  );
}
