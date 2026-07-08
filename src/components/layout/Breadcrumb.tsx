import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  accent?: 'purple' | 'blue' | 'emerald';
}

const ACCENT_CLASSES: Record<NonNullable<BreadcrumbProps['accent']>, string> = {
  purple: 'text-purple-600 hover:text-purple-800',
  blue: 'text-blue-600 hover:text-blue-800',
  emerald: 'text-emerald-600 hover:text-emerald-800',
};

export default function Breadcrumb({ items, accent = 'purple' }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const hoverClass = ACCENT_CLASSES[accent];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <button
        type="button"
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-slate-400 transition-colors hover:text-slate-600"
        title="Home"
      >
        <Home size={14} />
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight size={12} className="text-slate-300" />
            {isLast || !item.onClick ? (
              <span className="font-medium text-slate-700 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className={`font-medium transition-colors truncate max-w-[200px] ${hoverClass}`}
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
